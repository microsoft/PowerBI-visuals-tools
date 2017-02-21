############### Utility functions ###############
libraryRequireInstall = function(packageName, ...)
{
  if(!require(packageName, character.only = TRUE)) 
    warning(paste("*** The package: '", packageName, "' was not installed ***",sep=""))
}

libraryRequireInstall("XML")
libraryRequireInstall("htmlwidgets")

FlattenHTML <- function(fnameIn, fnameOut)
{
  # Read and parse HTML file
  if(!file.exists(fnameIn))
    return(FALSE)
  
  dir = dirname(fnameIn)
  html = htmlTreeParse(fnameIn,useInternal = TRUE)
  top = xmlRoot(html)
  
  # extract all <script> tags with src value
  srcNode=getNodeSet(top, '//script[@src]')
  for (node in srcNode)
  {
    b = xmlAttrs(node)
    f = file.path(dir, b['src'])
    alternateSrc = FindSrcReplacement(f)
    if (!is.null(alternateSrc))
    {
      s = alternateSrc
      names(s) = 'src'
      newNode = xmlNode("script",attrs = s)
      replaceNodes(node, newNode)
    }else{
      str=ReadFileForEmbedding(b['src']);
      if (!is.null(str))
      {      
        newNode = xmlNode("script", str, attrs = c(type="text/javascript"))
        replaceNodes(node, newNode)
      }
    }
  }
  
  # extract all <link> tags with src value
  linkNode=getNodeSet(top, '//link[@href]')
  for (node in linkNode)
  {
    b = xmlAttrs(node)
    f = file.path(dir, b['href'])
    str = ReadFileForEmbedding(f);
    if (!is.null(str))
    {
      newNode = xmlNode("style", str)
      replaceNodes(node, newNode)
    }
  }
  
  saveXML(html, file=fnameOut)
  return(TRUE)
}

ReadFullFile <- function(fname)
{
  if(!file.exists(fname))
    return(NULL)
  
  con = file(fname,open = "r")
  data = readLines(con)
  close(con)
  return(data)
}

ReadFileForEmbedding <- function(fname)
{
  data = ReadFullFile(fname)
  if (is.null(data))
    return(NULL)

  str = paste(data, collapse ='\n')
  str = paste(cbind('// <![CDATA[', str,'// ]]>'), collapse ='\n')
  return(str)
}

FindSrcReplacement <- function(str)
{
  str <- iconv(str, to="UTF-8")
  pattern = "plotlyjs-(\\w.+)/plotly-latest.min.js"
  match1=regexpr(pattern, str)
  attr(match1, 'useBytes') <- FALSE
  strMatch=regmatches(str, match1, invert = FALSE)
  if (length(strMatch)==0) return(NULL)
  
  pattern2 = "-(\\d.+)/"
  match2 = regexpr(pattern2, strMatch[1])
  attr(match2, 'useBytes') <- FALSE
  s = regmatches(strMatch[1], match2)
  if (length(s) == 0) return(NULL)
  
  verstr = substr(s, 2, nchar(s)-1)
  str = paste('https://cdn.plot.ly/plotly-', verstr,'.min.js', sep='')
  return(str)
}

internalSaveWidget <- function(w, fname)
{
  htmlwidgets::saveWidget(w, file=fname, selfcontained = FALSE)
  FlattenHTML(fname, fname)
}
#################################################